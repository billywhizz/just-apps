#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <signal.h>
#include <unistd.h>
#include <sys/signalfd.h>
#include <inttypes.h>
#include <stdarg.h>

static void die(char *s, ...) {
	va_list v;

	va_start(v, s);
	vfprintf(stderr, s, v);
	fprintf(stderr, "\n");
	va_end(v);
	fprintf(stderr, " -- errno = %i (%m)\n", errno);

	fflush(stderr);
	abort();
}

static void print_event (struct epoll_event ev) {
	char flags_str[200];

	flags_str[0] = 0;
	flags_str[1] = 0; /* dirty */

	if (ev.events & EPOLLIN )	strcat(flags_str, "|EPOLLIN");
	if (ev.events & EPOLLOUT)	strcat(flags_str, "|EPOLLOUT");
	if (ev.events & EPOLLERR)	strcat(flags_str, "|EPOLLERR");
	if (ev.events & EPOLLHUP)	strcat(flags_str, "|EPOLLHUP");
	if (ev.events & EPOLLRDHUP)	strcat(flags_str, "|EPOLLRDHUP");
	if (ev.events & EPOLLPRI)	strcat(flags_str, "|EPOLLPRI");
	if (ev.events & EPOLLET)	strcat(flags_str, "|EPOLLET");
	if (ev.events & EPOLLONESHOT)	strcat(flags_str, "|EPOLLONESHOT");

	fprintf(stderr, "Event for fd %i. Flags=(%s).\n",
			ev.data.fd, flags_str+1);
}

static void signal_handler (int signum) {
  fprintf(stderr, "signal %i\n", signum);
}

int setup_signalfd() {
	int sfd, ret;
	sigset_t sigset;

	ret = sigprocmask(SIG_SETMASK, NULL, &sigset);
	if (ret < 0)
		die("sigprocmask.1");

	sigaddset(&sigset, SIGINT);
	sigaddset(&sigset, SIGUSR1);
	sigprocmask(SIG_SETMASK, &sigset, NULL);
	if (ret < 0)
		die("sigprocmask.2");

	sigemptyset(&sigset);
	sigaddset(&sigset, SIGINT);
	sigaddset(&sigset, SIGUSR1);

	sfd = signalfd(-1, &sigset, 0);
	if (sfd < 0)
		die("signalfd");

	printf("sfd is %i\n", sfd);
	return sfd;
}

void read_sig(int sfd) {
	struct signalfd_siginfo info;
	int ret;

	ret = read(sfd, &info, sizeof info);
	if (ret != sizeof info)
		die("!?!?!?!");

	printf("Signal Received\n");
	printf("signo = %" PRIu32 "\n", info.ssi_signo);
	printf("pid   = %" PRIu32 "\n", info.ssi_pid);
	printf("uid   = %" PRIu32 "\n", info.ssi_uid);
}

int main() {
	int epfd;
	struct epoll_event ev;
	struct epoll_event ret;
	char buf[200];
	int n, t;
	int sfd;

	epfd = epoll_create(1);
	sfd = setup_signalfd();
	ev.data.fd = sfd;
	ev.events = EPOLLIN;
	if (epoll_ctl(epfd, EPOLL_CTL_ADD, sfd, &ev) != 0)
		perror("epoll_ctl");

	while ((n = epoll_wait(epfd, &ret, 1, -1)) > 0) {
		printf("tick!\n");
		print_event(ret);

		if (ret.data.fd == 0) {
			t = read(0, buf, 100);

			if (t == 0) {
				epoll_ctl(epfd, EPOLL_CTL_DEL, 0, NULL);
				close(0);
				printf("stdin done\n");
			}
		} else if (ret.data.fd == sfd) {
			read_sig(sfd);
		}
	}

	return 0;
}